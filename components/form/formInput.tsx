// components/form/FormInput.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "react-hook-form";

interface FormInputProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
}

export default function FormInput({
  name,
  label,
  placeholder = "",
  type = "text",
  disabled = false,
}: FormInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string;

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        disabled={disabled}
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
