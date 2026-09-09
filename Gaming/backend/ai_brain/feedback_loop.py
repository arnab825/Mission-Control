import json
import os
import logging
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

logger = logging.getLogger(__name__)

class EvaluationResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    is_good: bool = Field(description="True if the response is helpful, accurate, and safe.")
    feedback: str = Field(description="Detailed feedback explaining why the response is good or bad.")
    corrected_response: Optional[str] = Field(description="If is_good is False, provide a better, corrected response.", default=None)

DEFAULT_EVALUATOR_MODELS = [
    "meta/llama-3.2-11b-vision-instruct",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
]

class FeedbackLoop:
    """
    Evaluates agent responses via RLAIF and stores them in a DPO dataset for local Unsloth fine-tuning.
    Requires NVIDIA_API_KEY in the environment. If absent the loop is disabled gracefully.
    Features a multi-model cascade failover for resilient evaluation.
    """
    def __init__(self, dpo_dataset_path: str = "data/dpo_dataset.jsonl", evaluator_model: str = "meta/llama-3.2-11b-vision-instruct"):
        self.dpo_dataset_path = dpo_dataset_path
        self.enabled = False  # Disabled until API key is confirmed
        os.makedirs(os.path.dirname(os.path.abspath(self.dpo_dataset_path)), exist_ok=True)
        
        self.nvidia_key = os.environ.get("NVIDIA_API_KEY")
        if not self.nvidia_key:
            logger.warning(
                "NVIDIA_API_KEY not set — FeedbackLoop (RLAIF) is disabled. "
                "Set NVIDIA_API_KEY in your environment to enable AI response evaluation."
            )
            return  # Leave enabled=False; all public methods will be no-ops

        # Prepare failover cascade list
        self.evaluator_models = [evaluator_model] + [m for m in DEFAULT_EVALUATOR_MODELS if m != evaluator_model]

        try:
            self.parser = PydanticOutputParser(pydantic_object=EvaluationResult)
            
            self.eval_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert AI evaluator for a gaming assistant. Evaluate the AI's response to the user's prompt.\n{format_instructions}"),
                ("user", "Prompt: {prompt}\n\nAI Response: {response}\n\nEvaluate the response. If it's bad, provide a corrected response.")
            ])
            
            # Primary chain with first model (no timeout kwarg to prevent validation errors)
            primary_llm = ChatNVIDIA(model=self.evaluator_models[0], api_key=self.nvidia_key, temperature=0.2)
            self.eval_chain = self.eval_prompt | primary_llm | self.parser
            self.enabled = True
            logger.info("FeedbackLoop (RLAIF) initialised successfully.")
        except Exception as e:
            logger.warning(f"FeedbackLoop could not initialise evaluator chain: {e}")

    def evaluate_and_log(self, user_prompt: str, ai_response: str):
        """
        Evaluates the response and appends to the DPO JSONL dataset.
        No-op when FeedbackLoop is disabled (NVIDIA_API_KEY not set).
        Uses failover across active models if primary model is unavailable.
        """
        if not self.enabled:
            return

        eval_result: Optional[EvaluationResult] = None
        last_error = None

        for model_name in self.evaluator_models:
            try:
                llm = ChatNVIDIA(model=model_name, api_key=self.nvidia_key, temperature=0.2)
                chain = self.eval_prompt | llm | self.parser
                eval_result = chain.invoke({
                    "prompt": user_prompt,
                    "response": ai_response,
                    "format_instructions": self.parser.get_format_instructions()
                })
                if eval_result:
                    break
            except Exception as e:
                last_error = e
                err_str = str(e)
                if "410" in err_str or "Gone" in err_str or "end of life" in err_str.lower():
                    logger.warning(f"FeedbackLoop model '{model_name}' is EOL/deprecated: {e}. Trying fallback model...")
                elif "timed out" in err_str.lower() or "timeout" in err_str.lower():
                    logger.debug(f"FeedbackLoop model '{model_name}' timed out: {e}. Trying fallback model...")
                else:
                    logger.debug(f"FeedbackLoop model '{model_name}' failed: {e}. Trying fallback model...")

        if not eval_result:
            logger.warning(f"FeedbackLoop evaluation skipped after trying available models: {last_error}")
            return

        try:
            chosen = ai_response if eval_result.is_good else eval_result.corrected_response
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
            logger.error(f"Failed while storing feedback loop evaluation: {e}")
