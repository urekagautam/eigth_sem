export default function TitleDescription({ title, description }) {
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-2xl font-bold text-gray-900">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gray-700 leading-relaxed text-justify">
          {description}
        </p>
      )}
    </div>
  )
}
