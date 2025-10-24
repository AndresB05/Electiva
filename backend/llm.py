import os
from openai import OpenAI

def query_llm(question, relevant_documents, filename=None):
    # Check if we have any relevant documents
    if not relevant_documents:
        return "No se encontraron documentos relevantes para tu pregunta. Por favor, intenta reformular la pregunta o sube un documento con la información necesaria."

    print(f"Processing LLM query for question: '{question}'")
    print(f"Using {len(relevant_documents)} relevant documents")
    
    # Extract content from documents
    information = ''
    for i, document in enumerate(relevant_documents):
        information += f"--- Documento {i+1} (página {document.metadata.get('page_number', 'desconocida')}) ---\n"
        information += document.content + '\n\n'

    # Get page numbers for citation
    pages = ','.join([doc.metadata.get("page_number", "?") for doc in relevant_documents])
    
    # Add information about the document itself
    document_info = ""
    if filename:
        document_info = f"El nombre del archivo es: {filename}\n\n"

    system_prompt = f'''
    Instrucciones para responder a la pregunta del usuario:
    
    1. Responde ÚNICAMENTE en base a la información proporcionada a continuación.
    2. Responde en español de forma clara y concisa.
    3. Si no encuentras la respuesta en la información dada, di "No puedo encontrar la respuesta en la información proporcionada."
    4. No inventes información ni hagas suposiciones fuera del contenido dado.
    5. Si encuentras la respuesta, incluye al final: "La información se encuentra en la(s) página(s): {pages}"
    
    {document_info}
    
    Información disponible:
    {information}
    '''

    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        if not client.api_key or client.api_key.strip() == "":
            print("Error: API key missing or empty")
            return "Error: OpenAI API key is missing or empty. Please check your .env file."
        
        # Print first few characters of the API key to verify (safely)
        api_prefix = client.api_key[:5] + "..." if client.api_key else "None"
        print(f"Using API key starting with: {api_prefix}")
        
        print("Sending request to OpenAI API...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            temperature=0.3,  # Lower temperature for more consistent answers
        )
        
        answer = response.choices[0].message.content
        print(f"Received response from OpenAI: {answer[:100]}...")
        return answer
        
    except Exception as e:
        print(f"Error querying LLM: {str(e)}")
        import traceback
        traceback.print_exc()
        return f"Error al procesar tu pregunta: {str(e)}"


