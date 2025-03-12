import { useSortable } from "@dnd-kit/sortable";

const Placeholder = (): JSX.Element => {
  const { setNodeRef } = useSortable({ id: "placeholder" });
  return (
    <div
      className="text-gray-400 text-center"
      id="placeholder"
      ref={setNodeRef}
    >
      Drop here
    </div>
  );
};

export default Placeholder;