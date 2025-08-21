from flask import Flask, Response, render_template
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing.image import img_to_array
from flask import request
import numpy as np
app = Flask(__name__)

# Cargar modelo (asegúrate de tener tu modelo .h5 entrenado para estas frutas)
model = load_model('fruits_model.h5')  # Cambia por tu modelo real
CLASS_NAMES = ["banana", "fresa", "kiwi", "manzana", "naranja", "pina", "sandia", "uva"]



# Colores para cada fruta (en formato BGR) - ordenados según CLASS_NAMES
fruit_colors = {
    "banana": (0, 255, 255),     # Amarillo
    "fresa": (0, 0, 255),        # Rojo
    "kiwi": (0, 128, 0),         # Verde oscuro
    "manzana": (0, 0, 255),      # Rojo
    "naranja": (0, 165, 255),    # Naranja
    "pina": (0, 255, 255),       # Amarillo
    "sandia": (0, 0, 139),       # Rojo oscuro
    "uva": (128, 0, 128)         # Morado
}

def predict_image(image):
    """Realiza la predicción en una imagen"""
    image = cv2.resize(image, (224, 224))
    image = img_to_array(image)
    image = preprocess_input(image)
    image = np.expand_dims(image, axis=0)
    
    preds = model.predict(image)[0]
    idx = np.argmax(preds)
    return CLASS_NAMES[idx], float(preds[idx]), preds.tolist()

def add_fruit_effect(frame, fruit_type):
    """Añade efecto de borde y texto según la fruta detectada"""
    color = fruit_colors.get(fruit_type, (255, 255, 255))  # Blanco por defecto
    
    # Añadir borde difuminado
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (frame.shape[1], frame.shape[0]), color, 30)
    cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
    
    # Añadir texto descriptivo
    text = f"Fruta: {fruit_type.upper()}"
    text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1, 2)[0]
    text_x = (frame.shape[1] - text_size[0]) // 2
    cv2.putText(frame, text, (text_x, frame.shape[0] - 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
    
    return frame

def generate_frames():
    """Genera los frames de video con las predicciones"""
    global current_prediction, current_class, current_confidence
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            # Hacer predicción cada 15 frames
            if cv2.getTickCount() % 15 == 0:
                current_class, current_confidence, _ = predict_image(frame.copy())
                current_prediction = f"{current_class} ({current_confidence*100:.1f}%)"
            
            # Aplicar efectos visuales si se detecta una fruta
            if current_class in fruit_colors:
                frame = add_fruit_effect(frame, current_class)
            
            # Mostrar predicción en el frame
            cv2.putText(frame, current_prediction, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_frame', methods=['POST'])
def upload_frame():
    file_bytes = np.frombuffer(request.data, np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if frame is None:
        return {"error": "No se pudo leer el frame"}, 400

    class_name, confidence, probabilities = predict_image(frame)
    return {
        "class": class_name,
        "confidence": confidence,
        "probabilities": dict(zip(CLASS_NAMES, probabilities))
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)