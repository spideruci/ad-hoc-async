import type { MultiValue, ActionMeta,  } from "react-select";
import Select from "react-select";

export interface SelectFunctionInvocationProps {
  options: { value: string; label: string }[];
  selectedFunctions: Set<string>;
  handleSelectChange: (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{ value: string; label: string }>
  ) => void;
}

// Multi-Select for Functions
const SelectFunctionInvocation = ({
  options,
  selectedFunctions,
  handleSelectChange,
}: SelectFunctionInvocationProps) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "-40px",
        left: "10px",
        zIndex: 10,
        display: "flex",
        gap: "5px",
        flexWrap: "wrap",
      }}
    >
      <Select
        isMulti
        options={options}
        value={options.filter((option) => selectedFunctions.has(option.value))}
        closeMenuOnSelect={false}
        onChange={handleSelectChange}
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: "#333",
            borderColor: "#555",
            color: "#fff",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#333",
            color: "#fff",
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: "#555",
            color: "#fff",
          }),
          multiValueLabel: (base) => ({ ...base, color: "#fff" }),
          multiValueRemove: (base) => ({
            ...base,
            color: "#fff",
            ":hover": { backgroundColor: "#777", color: "#fff" },
          }),
        }}
      />
    </div>
  );
};
export default SelectFunctionInvocation;