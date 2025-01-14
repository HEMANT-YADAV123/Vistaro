// 'use client'

// import { Search } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { useState } from "react";


// function SearchBar() {
//     const router = useRouter();
//     const [query,setQuery] = useState("");

//     const handleSearch = (e: React.FormEvent)=>{
//         e.preventDefault();
//         // The URL is constructed as /search?q=<encoded-query>, where encodeURIComponent(query.trim()) ensures that any special characters in the search query (like spaces, ampersands, etc.) are safely encoded for the URL.
//         //For example, if the query is "hello world", it would redirect to /search?q=hello%20world.
//         if(query.trim())
//         {
//             router.push(`/search?q=${encodeURIComponent(query.trim())}`)
//         }
//     }

//   return (
//     <div>
//         <form onSubmit={handleSearch} className="relative">
//             <input 
//             type="text" 
//             value={query} 
//             onChange={(e) => setQuery(e.target.value)}
//             placeholder="search for events..."
//             className="w-full py-3 px-4 pl-12 bg-white rounded-xl border border-gray-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
//             />
//             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
//             <button
//              type="submit"
//              className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200">
//                 Search
//             </button>
//         </form>
//     </div>
//   )
// }

// export default SearchBar

//using only server component as next.js 15 has its own Form component. changed client component to server component.

import Form from 'next/form'
import { Search } from "lucide-react";

const SearchBar = () => {
  return (
    <div>
      <Form action={'/search'} className="relative">
            <input 
            type="text" 
            name='q'//for query
            placeholder="search for events..."
            className="w-full py-3 px-4 pl-12 bg-white rounded-xl border border-gray-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
            <button
             type="submit"
             className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200">
                Search
            </button>
        </Form>
    </div>
  )
}

export default SearchBar

