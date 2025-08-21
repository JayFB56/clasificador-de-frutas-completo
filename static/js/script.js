const classColors = {
    "banana": "#FFFF00",
    "fresa": "#FF0000",
    "kiwi": "#008000",
    "manzana": "#FF0000",
    "naranja": "#FFA500",
    "pina": "#FFFF00",
    "sandia": "#8B0000",
    "uva": "#800080"
};

const backgroundColors = {
    "banana": "#FFD700",   
    "fresa": "#FF2400",    
    "kiwi": "#228B22",    
    "manzana": "#FF0000", 
    "naranja": "#FF8C00",  
    "pina": "#FFD700",    
    "sandia": "#DC143C",   
    "uva": "#800080"       
};

const FRUIT_FILES = {
    banana: "banana.jpg",
    fresa: "fresa.jpg",
    kiwi: "kiwi.jpg",
    manzana: "manzana.jpg",
    naranja: "naranja.jpg",
    pina: "pina.jpg",
    sandia: "sandia.jpg",
    uva: "uva.jpg"
};

function normalizeFruitName(name) {
    if (!name) return null;
    const n = String(name)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return FRUIT_FILES[n] ? n : null;
}

let currentFruit = "";

function updateProgressBars(probs) {
    const container = document.getElementById('progressBars');
    container.innerHTML = '';

    const sortedClasses = ["banana", "fresa", "kiwi", "manzana", "naranja", "pina", "sandia", "uva"];

    for (const className of sortedClasses) {
        if (probs[className] !== undefined) {
            const percentage = Math.round(probs[className] * 100);
            const color = classColors[className] || '#cccccc';

            const barDiv = document.createElement('div');
            barDiv.className = 'progress-bar color-transition';

            const fillDiv = document.createElement('div');
            fillDiv.className = 'progress-fill color-transition';
            fillDiv.style.width = `${percentage}%`;
            fillDiv.style.background = `linear-gradient(90deg, ${color}66, ${color})`;

            const labelDiv = document.createElement('div');
            labelDiv.className = 'progress-label';
            labelDiv.textContent = `${className}: ${percentage}%`;

            barDiv.appendChild(fillDiv);
            barDiv.appendChild(labelDiv);
            container.appendChild(barDiv);
        }
    }
}

function updateBackgroundColor(fruitType) {
    const body = document.getElementById('bodyBackground');
    const normalizedFruit = normalizeFruitName(fruitType);
    const backgroundColor = backgroundColors[normalizedFruit] || '#ffffff';

    body.style.transition = 'background-color 1s ease';
    body.style.backgroundColor = backgroundColor;

    if (fruitType && fruitType !== currentFruit) {
        currentFruit = fruitType;

        body.style.transform = 'scale(1.02)';
        setTimeout(() => {
            body.style.transform = 'scale(1)';
        }, 300);
    }
}

// ---- Captura de cámara del usuario ----
const video = document.getElementById('userCamera');
const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d');

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error("No se pudo acceder a la cámara:", err));

// ---- Enviar frames al backend ----
setInterval(() => {
    if (video.videoWidth === 0 || video.videoHeight === 0) return; // seguridad

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        fetch('/upload_frame', {
            method: 'POST',
            body: blob
        })
        .then(res => res.json())
        .then(data => {
            if (data.class) {
                const predictionElement = document.getElementById('predictionText');
                predictionElement.textContent = `${data.class} (${Math.round(data.confidence * 100)}%)`;
                predictionElement.style.color = classColors[data.class] || '#2c3e50';

                updateProgressBars(data.probabilities);
                updateBackgroundColor(data.class);

                const fruitName = normalizeFruitName(data.class);
                const fruitContainer = document.getElementById("fruitImageDisplay");
                if (fruitContainer && fruitName) {
                    fruitContainer.innerHTML = `<img src="/static/images/${FRUIT_FILES[fruitName]}" 
                                                  alt="${fruitName}" style="width:120px;height:120px;">`;
                }
            }
        })
        .catch(err => console.error("Error en la predicción:", err));
    }, 'image/jpeg');
}, 1000);
