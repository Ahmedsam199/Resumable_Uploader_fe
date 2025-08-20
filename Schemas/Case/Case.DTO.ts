import * as yup from "yup";

export const CaseDTO = yup.object().shape({
  id: yup.number().nullable(),
  name: yup
    .string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),
});
