import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Navbar = () => {
    
    return (
  <nav className="sticky top-0 px-10 bg-[rgb(48,48,46)]/95 backdrop-blur-md text-white shadow-lg">
    <div className="w-full px py-5">
      <div className="flex justify-between items-center border-b border-gray-700 pb-3">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group transition-all duration-300"
        >
          <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all duration-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-wide group-hover:text-gray-200 transition-colors duration-300">
            SajakAI
          </h1>
        </Link>

      </div>
    </div>
  </nav>
);
}

export default Navbar;
