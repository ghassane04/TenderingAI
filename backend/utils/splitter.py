from llama_index.core.node_parser import SentenceSplitter
from llama_index.core import Document

def split_document(
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 64 
) -> list[str]:

    if not text or not text.strip():
        return []

    splitter = SentenceSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )

    nodes = splitter.get_nodes_from_documents([Document(text=text.strip())])
    
    chunks = [node.text for node in nodes]

    print(f"Chunks créés via LlamaIndex SentenceSplitter : {len(chunks)}")
    return chunks