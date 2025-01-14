import Image from "next/image"
import Link from "next/link"
import logo from '../../images/logo (2).png'
import { SignedIn, UserButton, SignedOut, SignInButton } from "@clerk/nextjs"
import SearchBar from "./SearchBar"

function Header() {
  return (
    <div className="border-b">
      <div className="flex flex-col lg:flex-row items-center gap-4 p-4">

            <div className="flex items-center justify-between w-full lg:w-auto">
                <Link href='/' className="font-bold shrink-0">
                    <Image
                    src={logo}
                    alt="logo"
                    width={100}
                    height={100}
                    className="w-24 lg:w-28"/>
                </Link>
                <div className="lg:hidden">
                    <SignedIn>
                        <UserButton/> {/* means userbutton will only render if we are signed in */}
                    </SignedIn>
                    {/* When you use <SignedOut mode="modal">, it means the login or signup form will pop up as a dialog box (a modal) over the current page, instead of taking you to a new page or showing the form directly on the screen. */}
                    <SignedOut>    
                        <SignInButton mode="modal">
                            <button className="bg-gray-100 text-gray-800 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                                Sign In
                            </button>
                        </SignInButton>                    
                    </SignedOut>
                </div>
            </div>
            {/* search bar full width on mobile */}
            <div className="w-full lg:max-w-2xl">
                <SearchBar/>
            </div>
            {/* for Desktop action button */}
            <div className="hidden lg:block ml-auto">
                <SignedIn>
                    <div className="flex items-center gap-3">

                        <Link href='/seller'>
                            <button className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition">
                                Sell Ticket
                            </button>
                        </Link>            
                        <Link href='/tickets'>
                            <button className="bg-gray-100 text-gray-800 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                                My Ticket
                            </button>
                        </Link>
                        <UserButton/>
                    </div>
                </SignedIn>

                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="bg-gray-100 text-gray-800 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                            Sign In
                        </button>
                    </SignInButton>
                </SignedOut>
            </div>

            {/*for mobile action button */}
            <div className="lg:hidden w-full flex justify-center gap-3">
                <SignedIn>
                    
                        <Link href='/seller' className="flex-1">
                            <button className="w-full bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition">
                                Sell Ticket
                            </button>
                        </Link>   

                        <Link href='/tickets' className="flex-1">
                            <button className="w-full bg-gray-100 text-gray-800 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                                My Ticket
                            </button>
                        </Link>
                    
                </SignedIn>
            </div>
      </div>
    </div>
  )
}

export default Header
