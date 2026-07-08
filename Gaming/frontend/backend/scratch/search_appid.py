from duckduckgo_search import DDGS

with DDGS() as ddgs:
    results = ddgs.text('007 First Light steam', max_results=20)
    for r in results:
        print(f"Link: {r['href']}")
        print(f"Snippet: {r['body']}\n")
