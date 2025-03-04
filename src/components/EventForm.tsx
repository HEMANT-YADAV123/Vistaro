"use client";
 
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";//Zod is a validation library that helps ensure the data in your form is correct before it gets submitted.
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStorageUrl } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const formSchema = z.object({ //it allows us to define what data is allowed to go inside a form
    name: z.string().min(1, "Event name is required"),
    description: z.string().min(1, "Description is required"),
    location: z.string().min(1, "Location is required"),
    eventDate: z
      .date()
      .min(
        new Date(new Date().setHours(0, 0, 0, 0)),
        "Event date must be in the future"
      ),
    price: z.number().min(0, "Price must be 0 or greater"),
    totalTickets: z.number().min(1, "Must have at least 1 ticket"),
  });

  type FormData = z.infer<typeof formSchema>;

  interface InitialEventData {
    _id: Id<"events">;
    name: string;
    description: string;
    location: string;
    eventDate: number;
    price: number;
    totalTickets: number;
    imageStorageId?: Id<"_storage">;
  }

  interface EventFormProps {
    mode: "create" | "edit";
    initialData?: InitialEventData;
  }
  

const EventForm = ({ mode, initialData }: EventFormProps) => {

    const { user } = useUser();
    const createEvent = useMutation(api.events.create);
    const updateEvent = useMutation(api.events.updateEvent);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const currentImageUrl = useStorageUrl(initialData?.imageStorageId);

     // Image upload
    const imageInput = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
    const updateEventImage = useMutation(api.storage.updateEventImage);
    const deleteImage = useMutation(api.storage.deleteImage);

    const [removedCurrentImage, setRemovedCurrentImage] = useState(false);

    // Form Initialization
    const form = useForm<FormData>({ //Uses react-hook-form to:
        resolver: zodResolver(formSchema),//Apply Zod validation.
        defaultValues: { //Set default values if initialData exists.
          name: initialData?.name ?? "",
          description: initialData?.description ?? "",
          location: initialData?.location ?? "",
          eventDate: initialData ? new Date(initialData.eventDate) : new Date(),
          price: initialData?.price ?? 0,
          totalTickets: initialData?.totalTickets ?? 1,
        },
      });

      async function onSubmit(values: FormData) {
        if (!user?.id) return;

        startTransition(async () => {
          try {
            let imageStorageId = null;
    
            // Handle image changes
            if (selectedImage) {
              // Upload new image
              imageStorageId = await handleImageUpload(selectedImage);
            }
    
            // Handle image deletion/update in edit mode
            if (mode === "edit" && initialData?.imageStorageId) {
              if (removedCurrentImage || selectedImage) {
                // Delete old image from storage
                await deleteImage({
                  storageId: initialData.imageStorageId,
                });
              }
            }
    
            if (mode === "create") {
              const eventId = await createEvent({
                ...values,
                userId: user.id,
                eventDate: values.eventDate.getTime(),
              });
    
              if (imageStorageId) {
                await updateEventImage({
                  eventId,
                  storageId: imageStorageId as Id<"_storage">,
                });
              }
    
              router.push(`/event/${eventId}`);
            } else {
              // Ensure initialData exists before proceeding with update
              if (!initialData) {
                throw new Error("Initial event data is required for updates");
              }
    
              // Update event details
              await updateEvent({
                eventId: initialData._id,
                ...values,
                eventDate: values.eventDate.getTime(),
              });
    
              // Update image - this will now handle both adding new image and removing existing image
              if (imageStorageId || removedCurrentImage) {
                await updateEventImage({
                  eventId: initialData._id,
                  // If we have a new image, use its ID, otherwise if we're removing the image, pass null
                  storageId: imageStorageId
                    ? (imageStorageId as Id<"_storage">)
                    : null,
                });
              }
    
              toast({
                title: "Event updated",
                description: "Your event has been successfully updated.",
              });
    
              router.push(`/event/${initialData._id}`);
            }
          } catch (error) {
            console.error("Failed to handle event:", error);
            toast({
              variant: "destructive",
              title: "Uh oh! Something went wrong.",
              description: "There was a problem with your request.",
            });
          }
        });
     }

      async function handleImageUpload(file: File): Promise<string | null> {//it take a file as input
        try {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,//pass the file in the body.
          });
          const { storageId } = await result.json();
          return storageId;
        } catch (error) {
          console.error("Failed to upload image:", error);
          return null;
        }
      }

      const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];//select the file we selected
        if (file) {
          setSelectedImage(file);
          const reader = new FileReader();//store in local storage
          reader.onloadend = () => {
            setImagePreview(reader.result as string);//set image preview
          };
          reader.readAsDataURL(file);//read the data in the file
        }
      };


  return (
    // The form is wrapped inside <Form {...form}> which connects it to React Hook Form.
    <Form {...form}>
        {/*form.handleSubmit(onSubmit) ensures the form data is handled correctly when submitted. */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Form fields */}
        <div className="space-y-4">
            {/* Each field is wrapped inside <FormField> which is controlled using form.control. */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input {...field} />{/* <Input {...field} /> binds the field's state to React Hook Form. */}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null
                      );
                    }}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Ticket</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2">
                      ₹
                    </span>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="pl-6"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalTickets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Tickets Available</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Event Image
            </label>
            <div className="mt-1 flex items-center gap-4">
              {imagePreview || (!removedCurrentImage && currentImageUrl) ? (
                <div className="relative w-32 aspect-square bg-gray-100 rounded-lg">
                  <Image
                    src={imagePreview || currentImageUrl!}
                    alt="Preview"
                    fill
                    className="object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      setRemovedCurrentImage(true);
                      if (imageInput.current) {
                        imageInput.current.value = "";
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={imageInput}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === "create" ? "Creating Event..." : "Updating Event..."}
            </>
          ) : mode === "create" ? (
            "Create Event"
          ) : (
            "Update Event"
          )}
        </Button>
      </form>
    </Form>
  )
}

export default EventForm
