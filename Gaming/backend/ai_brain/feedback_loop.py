import json
import os
import logging
from typing import Optional
from pydantic import BaseModel, Field

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

logger = logging.getLogger(__name__)

class EvaluationResult(BaseModel):
    is_good: bool = Field(description="True if the response is helpful, accurate, and safe.")
    feedback: str = Field(description="Detailed feedback explaining why the response is good or bad.")
    corrected_response: Optional[str] = Field(description="If is_good is False, provide a better, corrected response.", default=None)

class FeedbackLoop:
    """
    Evaluates agent responses via RLAIF and stores them in a DPO dataset for local Unsloth fine-tuning.
    Requires NVIDIA_API_KEY in the environment. If absent the loop is disabled gracefully.
    """
    def __init__(self, dpo_dataset_path: str = "data/dpo_dataset.jsonl", evaluator_model="meta/llama-3.3-70b-instruct"):
        self.dpo_dataset_path = dpo_dataset_path
        self.enabled = False  # Disabled until API key is confirmed
        os.makedirs(os.path.dirname(os.path.abspath(self.dpo_dataset_path)), exist_ok=True)
        
        nvidia_key = os.environ.get("NVIDIA_API_KEY")
        if not nvidia_key:
            logger.warning(
                "NVIDIA_API_KEY not set — FeedbackLoop (RLAIF) is disabled. "
                "Set NVIDIA_API_KEY in your environment to enable AI response evaluation."
            )
            return  # Leave enabled=False; all public methods will be no-ops

        try:
            # We use a secondary LLM to evaluate the primary one
            self.evaluator_llm = ChatNVIDIA(model=evaluator_model, api_key=nvidia_key, temperature=0.2, timeout=30.0)
            
            self.parser = PydanticOutputParser(pydantic_object=EvaluationResult)
            
            self.eval_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert AI evaluator for a gaming assistant. Evaluate the AI's response to the user's prompt.\n{format_instructions}"),
                ("user", "Prompt: {prompt}\n\nAI Response: {response}\n\nEvaluate the response. If it's bad, provide a corrected response.")
            ])
            
            self.eval_chain = self.eval_prompt | self.evaluator_llm | self.parser
            self.enabled = True
            logger.info("FeedbackLoop (RLAIF) initialised successfully.")
        except Exception as e:
            logger.warning(f"FeedbackLoop could not initialise evaluator chain: {e}")

    def evaluate_and_log(self, user_prompt: str, ai_response: str):
        """
        Evaluates the response and appends to the DPO JSONL dataset.
        No-op when FeedbackLoop is disabled (NVIDIA_API_KEY not set).
        """
        if not self.enabled:
            return
        try:
            eval_result: EvaluationResult = self.eval_chain.invoke({
                "prompt": user_prompt,
                "response": ai_response,
                "format_instructions": self.parser.get_format_instructions()
            })
            
            chosen = ai_response if eval_result.is_good else eval_result.corrected_response
            # For simplicity: if it was a good response, we just invent a weak rejected response.
            # Ideally, rejected comes from a weaker model in real RLHF pipelines.
            rejected = ai_response if not eval_result.is_good else "I'm not sure how to help with that." 
            
            if not eval_result.is_good and not chosen:
                logger.warning("Evaluator marked response as bad but provided no correction. Skipping DPO log.")
                return
                
            dpo_entry = {
                "prompt": user_prompt,
                "chosen": chosen,
                "rejected": rejected,
                "feedback": eval_result.feedback
            }
            
            with open(self.dpo_dataset_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(dpo_entry) + "\n")
                
            logger.info("Logged DPO pair to dataset.")
            
        except Exception as e:
            logger.error(f"Failed during feedback loop evaluation: {e}")
