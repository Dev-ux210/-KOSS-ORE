from pdf_ingestion import extract_pages
from pdf_ingestion import extract_pdf_text
from pdf_chunking import chunk_pages
from vector_store import store_chunk
from retriever import retrieve_context
from answer_questions import answer_questions
from viva import generate_viva

pdf_path = "./tests/data/sample.pdf"

pages = extract_pages(pdf_path)

chunks = chunk_pages(pages)

for i, chunk in enumerate(chunks):
    store_chunk(
        chunk_id=i,
        text=chunk["text"],
        page=chunk["page"]
    )

pdf_text = extract_pdf_text(pdf_path)

print(generate_viva(pdf_text))




