import { useState, useRef } from 'react'
import Navbar from '../components/Navbar.jsx'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const extractVideoFrames = async (videoFile, numFrames = 5) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(videoFile);
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        
        video.onloadedmetadata = async () => {
            const duration = video.duration;
            if (isNaN(duration) || duration === 0) {
                URL.revokeObjectURL(url);
                reject(new Error("Invalid video duration"));
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            const frames = [];
            const interval = duration / numFrames;

            for (let i = 0; i < numFrames; i++) {
                const targetTime = (i * interval) + (interval / 2);
                video.currentTime = targetTime;
                
                await new Promise(r => {
                    video.onseeked = () => {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob(blob => {
                            if (blob) {
                                frames.push(blob);
                            }
                            r();
                        }, 'image/jpeg', 0.9);
                    };
                });
            }
            
            URL.revokeObjectURL(url);
            resolve(frames);
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error("Error loading video"));
        };
    });
  }

  const handleFile = (selectedFile) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/') || selectedFile.type.startsWith('audio/') || selectedFile.name.toLowerCase().endsWith('.mp3');

    if (!isImage && !isVideo) {
        alert('Please upload an image, video, or audio file.')
        return
    }
    
    setFile(selectedFile)
    setResult(null)
    setError(null)

    if (isImage) {
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreview(e.target.result)
            analyzeFile(selectedFile, false)
        }
        reader.readAsDataURL(selectedFile)
    } else {
        const url = URL.createObjectURL(selectedFile)
        setPreview(url)
        analyzeFile(selectedFile, true)
    }
  }

  const analyzeFile = async (selectedFile, isVideo) => {
    setLoading(true)
    
    const formData = new FormData()

    try {
        if (isVideo) {
            const frames = await extractVideoFrames(selectedFile, 5);
            frames.forEach((frameBlob, index) => {
                formData.append("files", frameBlob, `frame_${index}.jpg`);
            });
        } else {
            formData.append("file", selectedFile);
        }

        const response = await fetch("http://localhost:8000/predict", {
            method: "POST",
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`)
        }
        
        const data = await response.json()
        setResult(data)
    } catch (err) {
        console.error('Error during prediction:', err)
        setError('Failed to analyze file. Please ensure the backend is running at http://localhost:8000/predict')
    } finally {
        setLoading(false)
    }
  }

  const reset = () => {
    if (preview && file && !file.type.startsWith('image/')) {
        URL.revokeObjectURL(preview);
    }
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Calculate confidence from result
  let conf = 0
  let predictionString = "UNKNOWN"
  let isFake = false

  if (result) {
    predictionString = result.prediction ? result.prediction.toUpperCase() : "UNKNOWN"
    isFake = predictionString === 'FAKE'
    
    conf = result.confidence_percent
    if (conf === undefined && result.fake_probability !== undefined) {
        conf = result.fake_probability * 100
    } else if (conf === undefined) {
        conf = 0
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(31,31,30)] text-white overflow-y-auto flex flex-col">
      <Navbar />

      <main className="
        flex-1
        flex
        flex-col
        items-center
        justify-center
        px-6
        py-10
      ">
        {/* Hero */}
        <section className="text-center max-w-3xl mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-400 mb-4">
            AI-Powered Deepfake Detection
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-2">
            Is this real?
          </h1>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            Let us find out.
          </h1>
          <p className="mt-5 text-base md:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Upload any image, video, or audio and SajakAI will detect signs of synthetic manipulation in seconds.
          </p>
        </section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-2xl mb-8 max-w-2xl w-full text-center">
            {error}
            <div className="mt-4">
              <button onClick={reset} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Content Area */}
        <section className="w-full max-w-2xl">
          
          {/* Upload Area */}
          {!file && !loading && !result && !error && (
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                group flex flex-col items-center justify-center h-64 rounded-3xl border-2 border-dashed
                transition-all duration-300 cursor-pointer
                ${isDragOver ? 'bg-[rgb(48,48,46)] border-gray-400 shadow-xl' : 'bg-[rgb(40,40,39)] border-gray-700 hover:bg-[rgb(48,48,46)] hover:border-gray-400 hover:shadow-xl'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.mp3"
                onChange={handleFileChange}
              />
              <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-10 h-10 text-gray-400 group-hover:text-white transition">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V7.5m0 0-3 3m3-3 3 3" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Drop your file here</h3>
              <p className="text-sm text-gray-400 mt-2">or click to browse</p>
              <p className="text-xs text-gray-500 mt-3">JPG • PNG • MP4 • MP3</p>
            </label>
          )}

          {/* Loading State */}
          {loading && preview && !error && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
              <div className="relative w-72 h-72 rounded-3xl overflow-hidden shadow-2xl border border-gray-700 bg-[rgb(20,20,20)]">
                {file && file.type.startsWith('image/') ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
                ) : (
                    <video src={preview} className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <div className="text-white font-medium tracking-wide">
                    Analyzing file...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Result State */}
          {result && preview && !loading && !error && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
              <div className="relative w-72 h-72 rounded-3xl overflow-hidden shadow-2xl border border-gray-700 mb-8 bg-[rgb(20,20,20)]">
                {file && file.type.startsWith('image/') ? (
                    <img src={preview} alt="Analyzed" className="w-full h-full object-cover" />
                ) : (
                    <video src={preview} controls className="w-full h-full object-cover" />
                )}
              </div>

              <div className="w-full bg-[rgb(40,40,39)] border border-gray-700 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Analysis Result</h2>
                  <span className={`px-5 py-2 rounded-full text-sm font-bold tracking-widest uppercase shadow-lg ${
                    isFake
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-red-500/20' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-green-500/20'
                  }`}>
                    {predictionString}
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-400">Confidence Score</span>
                    <span className="text-white text-xl font-bold">
                      {conf.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isFake ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${conf}%` }}
                    ></div>
                  </div>
                </div>

                <button 
                  onClick={reset}
                  className="w-full py-4 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all duration-200 border border-gray-600 hover:border-gray-400"
                >
                  Analyze Another File
                </button>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  )
}

export default App
