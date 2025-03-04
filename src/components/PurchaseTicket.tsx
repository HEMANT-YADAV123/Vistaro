'use client'

import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import ReleaseTicket from "./ReleaseTicket";
import { createStripeCheckoutSession } from "../../actions/createStripeCheckoutSession";

function PurchaseTicket({eventId} : {eventId: Id<"events">}) {
    const router = useRouter();
    const {user} = useUser();

    const queuePosition = useQuery(api.waitingList.getQueuePosition,{ //it fetches the position of user in the queue.
          eventId,
          userId: user?.id ?? ""
    });

    const [timeRemaining, setTimeRemaining] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const offerExpiresAt = queuePosition?.offerExpiresAt ?? 0;
    const isExpired = Date.now() > offerExpiresAt;

    useEffect(() =>{
        const calculateTimeRemaining = () => {
            if(isExpired) {
                setTimeRemaining("Expired");
                return ;
            }

            const diff = offerExpiresAt - Date.now();
            const minutes = Math.floor(diff/1000/60);
            const seconds = Math.floor((diff/1000)%60);

            if(minutes>0)
            {
                setTimeRemaining(
                    `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${seconds === 1 ? "" : "s"}`
                )
            }
            else
            {
                setTimeRemaining(`${seconds} second${seconds === 1 ? "" : "s"}`);
            }
        };
        calculateTimeRemaining();//call the calculate timeRemaining.

        const interval = setInterval(calculateTimeRemaining,1000);
        return() => clearInterval(interval);
    },[offerExpiresAt,isExpired]);//this useEfeect run the internal thing when offerExpiresAt or isExpired changes.

    // create stripe checkout.
    const handlePurchase = async () => {
        if (!user) return;

        try {
        setIsLoading(true);
            const { sessionUrl } = await createStripeCheckoutSession({
            eventId,
        });

        if (sessionUrl) {
            router.push(sessionUrl);
        }
        } 
        catch (error) {
            console.error("Error creating checkout session:", error);
        } finally {
            setIsLoading(false);
        }
    }
//we need web hook after transection

    if(!user || !queuePosition || queuePosition.status !== "offered")
    {
        return null;
    }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-amber-200">
        <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <Ticket className="h-6 w-6 text-amber-600"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Ticket Reserved
                            </h3>
                            <p className="text-sm text-gray-500">
                                Expire in {timeRemaining}
                            </p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed">
                        A ticket has been reserved for you. Complete your purchase before the timer expires to secure your spot at this event.
                    </div>
                </div>    
            </div>
            <button
            onClick={handlePurchase}
            disabled = {isExpired || isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-4 rounded-lg font-bold shadow-md hover:from-amber-600 hover:to-amber-700 transform hover:scale[1.02] transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
            >
                {isLoading
                   ? "Redirecting to checkout ..."
                    : "Purchase Your Ticket Now"
                }
            </button>

            <div className="mt-4">
                <ReleaseTicket eventId={eventId} waitingListId={queuePosition._id}/>
            </div>
        </div>
    </div>

  )
}

export default PurchaseTicket
