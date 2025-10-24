import os
import uuid
import PyPDF2
import chromadb
from document import Document

# Obtener la carpeta del backend
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_FOLDER = os.path.join(BACKEND_DIR, 'pdf_files')
CHROMA_DB_DIR = os.path.join(BACKEND_DIR, 'chroma_db')

# Crear carpeta chroma_db si no existe
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

def create_embeddings(chatbot_id, file_name):
    #extraer el texto del pdf
    pdf_path = os.path.join(PDF_FOLDER, file_name)
    
    # Validar que el archivo existe
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Validar que el archivo no esté vacío
    if os.path.getsize(pdf_path) == 0:
        raise ValueError(f"PDF file is empty: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Validar que el PDF tiene páginas
            if len(pdf_reader.pages) == 0:
                raise ValueError(f"PDF has no pages: {file_name}")

            documents = []
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                
                # Solo agregar si tiene contenido
                if text and text.strip():
                    document = Document(
                        doc_id=str(uuid.uuid4()),
                        content=text.strip(),
                        metadata={'page_number': str(page_num)}
                    )
                    documents.append(document)

            # Si no hay documentos con contenido, lanzar error
            if not documents:
                raise ValueError(f"No readable content found in PDF: {file_name}")

            #crear embeddings y guardar usando persistent storage
            client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            
            # Check if collection exists and delete it to avoid conflicts
            try:
                existing_collection = client.get_collection(chatbot_id)
                if existing_collection:
                    client.delete_collection(chatbot_id)
            except:
                pass
                
            collection = client.create_collection(chatbot_id)
            
            # Add documents in batches to improve reliability
            for doc in documents:
                collection.add(
                    documents=doc.content,
                    ids=doc.id,
                    metadatas=doc.metadata
                )
    except Exception as e:
        raise Exception(f"Error processing PDF '{file_name}': {str(e)}")

def get_documents(chatbot_id, question):
    try:
        # Use persistent client
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        
        # Validate collection exists
        collection = client.get_collection(chatbot_id)
        
        print(f"Querying collection {chatbot_id} with question: '{question}'")
        
        # Get relevant documents with explicit parameters
        result = collection.query(
            query_texts=[question],  # Make sure it's a list
            n_results=3,
            include=["metadatas", "documents"],
        )
        
        # Check if we got any results
        if not result or not result['ids'] or len(result['ids'][0]) == 0:
            print(f"No documents found for question: '{question}'")
            return []
        
        print(f"Raw query results: {len(result['documents'][0])} documents")
        
        relevant_docs = []
        for i, doc_id in enumerate(result['ids'][0]):
            if i < len(result['documents'][0]) and i < len(result['metadatas'][0]):
                doc = Document(
                    doc_id=doc_id,
                    content=result['documents'][0][i],
                    metadata=result['metadatas'][0][i]
                )
                relevant_docs.append(doc)
                print(f"Document {i+1} - ID: {doc_id}, Page: {doc.metadata.get('page_number', 'unknown')}")
                print(f"Content preview: {doc.content[:50]}...")
        
        print(f"Found {len(relevant_docs)} relevant documents")
        return relevant_docs
    except Exception as e:
        print(f"Error retrieving documents: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
    
    