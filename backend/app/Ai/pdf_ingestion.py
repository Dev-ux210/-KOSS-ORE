import fitz


def extract_pages(pdf_path):
    pdf_path = str(pdf_path)
    doc = fitz.open(pdf_path)
    pages = []
    try:
        for page_num, page in enumerate(doc):
            pages.append({"page": page_num + 1, "text": page.get_text() or ""})
    finally:
        doc.close()
    return pages


def extract_pdf_text(pdf_path):
    pages = extract_pages(pdf_path)
    return "\n".join(p["text"] for p in pages).strip() + "\n"