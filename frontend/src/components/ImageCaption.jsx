export default function ImageCaption({ imagePath, caption, alt = "Notice image" }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-md">
        <img
          src={imagePath}
          alt={alt}
          className="h-auto w-full object-cover"
        />
      </div>
      {caption && (
        <p className="text-sm font-medium italic text-gray-600">{caption}</p>
      )}
    </div>
  )
}
