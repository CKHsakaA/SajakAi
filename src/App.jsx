import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import './App.css'

function App() {
  const [file, setFile] = useState(null)

  return (
  <div className="h-screen bg-[rgb(31,31,30)] text-white overflow-hidden">
    <Navbar />

    <main className="
      h-[calc(100vh-100px)]
      flex
      flex-col
      items-center
      justify-center
      px-6
    ">

      {/* Hero */}
      <section className="text-center max-w-3xl">

        <p className="
          text-xs
          uppercase
          tracking-[0.35em]
          text-gray-400
          mb-4
        ">
          AI-Powered Deepfake Detection
        </p>


        <h1 className="
          text-5xl
          md:text-6xl
          font-bold
          tracking-tight
        ">
          Is this real?
        </h1>


        <h1 className="
          text-5xl
          md:text-6xl
          font-bold
          bg-gradient-to-r
          from-white
          to-gray-500
          bg-clip-text
          text-transparent
        ">
          Let us find out.
        </h1>


        <p className="
          mt-5
          text-base
          md:text-lg
          text-gray-400
          max-w-xl
          mx-auto
          leading-relaxed
        ">
          Upload any image or video and SajakAI will detect
          signs of synthetic manipulation in seconds.
        </p>

      </section>



      {/* Upload Area */}
      <section className="
        w-full
        max-w-2xl
        mt-10
      ">

        <label
          className="
          group
          flex
          flex-col
          items-center
          justify-center

          h-64

          rounded-3xl
          border-2
          border-dashed
          border-gray-700

          bg-[rgb(40,40,39)]

          cursor-pointer

          transition-all
          duration-300

          hover:bg-[rgb(48,48,46)]
          hover:border-gray-400
          hover:shadow-xl
          "
        >

          <input
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={(e)=>{console.log(e.target.file)}}
          />


          <div className="
            p-4
            rounded-full
            bg-white/5
            group-hover:bg-white/10
            transition
            duration-300
          ">

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="
                w-10
                h-10
                text-gray-400
                group-hover:text-white
                transition
              "
            >

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V7.5m0 0-3 3m3-3 3 3"
              />

            </svg>

          </div>



          <h3 className="
            mt-4
            text-xl
            font-semibold
          ">
            Drop your file here
          </h3>


          <p className="
            text-sm
            text-gray-400
            mt-2
          ">
            or click to browse
          </p>


          <p className="
            text-xs
            text-gray-500
            mt-3
          ">
            JPG • PNG • MP4 • MOV
          </p>


        </label>


      </section>


    </main>
  </div>
);
}

export default App
