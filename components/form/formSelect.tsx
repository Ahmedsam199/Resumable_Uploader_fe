"use client";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface OptionType {
  [key: string]: string | number | boolean | undefined;
}

interface FormSelectProps {
  name: string;
  label: string;
  options: OptionType[];
  valueName: string;
  textName: string;
  extraOnChange?: (value: string, option?: OptionType) => void;
  placeholder?: string;
}

export function FormSelect({
  name,
  label,
  options,
  valueName,
  textName,
  extraOnChange,
  placeholder = "Select an option",
}: FormSelectProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const handleValueChange = (val: string) => {
    // Find the selected option for passing to extraOnChange
    const selectedOption = options.find(
      (option) => String(option[valueName]) === val
    );

    try {
      if (extraOnChange && typeof extraOnChange === "function") {
        extraOnChange(val, selectedOption);
      }
    } catch (error) {
      console.error("Error in extraOnChange callback:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value ?? ""}
            onValueChange={(val) => {
              field.onChange(val);
              handleValueChange(val);
            }}
          >
            <SelectTrigger id={name} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={String(option[valueName])}
                  value={String(option[valueName])}
                >
                  {option[textName]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {errors[name] && (
        <p className="text-sm text-red-500">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}
