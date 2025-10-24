import os
import uuid
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from embeddings import create_embeddings, get_documents, CHROMA_DB_DIR
from llm import query_llm

load_dotenv()

app = Flask(__name__)
CORS(app)

chatbot_status = {}

# Obtener la carpeta del backend
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_FOLDER = os.path.join(BACKEND_DIR, 'pdf_files')

# Crear carpetas necesarias
os.makedirs(PDF_FOLDER, exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

@app.route('/build_chatbot', methods=['POST'])
def build_chatbot():
    if 'file' not in request.files:
        return jsonify({'error': 'No file found'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file:
        try:
            # Guardar el archivo
            file_path = os.path.join(PDF_FOLDER, file.filename)
            file.save(file_path)
            
            # Verificar que el archivo se guardó correctamente
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                return jsonify({'error': 'File is empty or failed to save'}), 400

            chatbot_id = str(uuid.uuid4())
            chatbot_status[chatbot_id] = {
                'status': 'Creating embeddings',
                'filename': file.filename
            }
            
            try:
                create_embeddings(chatbot_id, file.filename)
                chatbot_status[chatbot_id] = {
                    'status': 'Embeddings ready',
                    'filename': file.filename
                }
                return jsonify({'chatbot_id': chatbot_id}), 201
            except Exception as e:
                chatbot_status[chatbot_id] = {
                    'status': 'Error', 
                    'error': str(e),
                    'filename': file.filename
                }
                return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500
        except Exception as e:
            return jsonify({'error': f'Error: {str(e)}'}), 500
    else:
        return jsonify({'error': 'No file found'}), 400

@app.route('/chatbot_status/<string:chatbot_id>', methods=['GET'])
def get_chatbot_status(chatbot_id):
    status_info = {
        'chatbot_id': chatbot_id,
        'in_memory_status': chatbot_id in chatbot_status,
        'status_data': chatbot_status.get(chatbot_id, {})
    }
    
    # Check if collection exists in ChromaDB
    try:
        import chromadb
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        collections = client.list_collections()
        collection_exists = any(col.name == chatbot_id for col in collections)
        status_info['collection_exists'] = collection_exists
        
        if collection_exists:
            try:
                collection = client.get_collection(chatbot_id)
                count = collection.count()
                status_info['document_count'] = count
            except Exception as e:
                status_info['collection_error'] = str(e)
    except Exception as e:
        status_info['chroma_error'] = str(e)
    
    return jsonify(status_info)

@app.route('/ask_chatbot/<string:chatbot_id>', methods=['POST'])
def ask_chatbot(chatbot_id):
    print("\n" + "-"*50)
    print(f"NEW QUESTION REQUEST - Chatbot ID: {chatbot_id}")
    print("-"*50)
    
    # Verify chatbot exists in status dictionary
    if chatbot_id not in chatbot_status:
        print(f"Chatbot ID not found in status: {chatbot_id}")
        
        # Check if the collection exists in ChromaDB anyway
        try:
            from embeddings import CHROMA_DB_DIR
            import chromadb
            client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            try:
                collection = client.get_collection(chatbot_id)
                print(f"Collection found in ChromaDB but not in status, adding it")
                # We don't know the filename, so set it as unknown
                chatbot_status[chatbot_id] = {
                    'status': 'Embeddings ready',
                    'filename': 'unknown_document.pdf'
                }
            except Exception as cdb_error:
                print(f"Collection not found in ChromaDB: {str(cdb_error)}")
                return jsonify({'error': 'Chatbot not found'}), 404
        except Exception as e:
            print(f"Error checking ChromaDB: {str(e)}")
            return jsonify({'error': 'Chatbot not found'}), 404

    # Parse request data
    data = request.get_json()
    if not data or 'question' not in data:
        print("Error: Missing question in request body")
        return jsonify({'error': 'Missing "question" in the request body'}), 400

    # Extract question from request
    question = data['question'].strip()
    print(f"Processing question: '{question}'")
    
    # Get filename from status
    filename = chatbot_status[chatbot_id].get('filename', 'unknown_document.pdf')
    print(f"Document filename: {filename}")

    # Special handling for filename questions
    if any(term in question.lower() for term in ["nombre del archivo", "archivo", "documento", "pdf"]):
        if "nombre" in question.lower():
            print("Special case: Filename question detected")
            answer = f"El nombre del archivo es: {filename}"
            return jsonify({'answer': answer}), 200

    # Query the vector database for relevant documents
    print("Retrieving relevant documents...")
    relevant_documents = get_documents(chatbot_id, question)
    
    # Log document retrieval results
    print(f"Found {len(relevant_documents)} relevant documents")
    
    # Query the LLM with the relevant documents
    print("Querying LLM with relevant documents...")
    answer = query_llm(question, relevant_documents, filename)
    
    # Log and return the answer
    print(f"Final answer: {answer[:100]}...")
    print("-"*50 + "\n")
    
    return jsonify({'answer': answer}), 200

if __name__ == '__main__':
    app.run(debug=True)
