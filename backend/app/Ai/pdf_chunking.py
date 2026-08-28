from langchain_text_splitters import RecursiveCharacterTextSplitter


def _splitter(chunk_size=1000, chunk_overlap=200):
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


def create_chunks(text, chunk_size=1000, chunk_overlap=200):
    if not text or not text.strip():
        return []
    return _splitter(chunk_size, chunk_overlap).split_text(text)


chunk_text = create_chunks


def chunk_pages(pages, chunk_size=500, overlap=50):
    out = []
    chunk_id = 1
    step = max(chunk_size - overlap, 1)

    for page in pages:
        text = page.get("text", "") or ""
        page_num = page.get("page", 0)
        if not text:
            continue

        start = 0
        n = len(text)
        while start < n:
            out.append({
                "chunk_id": chunk_id,
                "page": page_num,
                "text": text[start:start + chunk_size],
            })
            chunk_id += 1
            start += step

    return out
