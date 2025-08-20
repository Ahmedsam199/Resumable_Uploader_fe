import FormInput from "@/components/form/formInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CaseDTO } from "@/Schemas/Case/Case.DTO";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import Routes from "@/Routes.json";
import axios from "axios";

interface CaseFormProps {
  modalState: {
    open: boolean;
    data?: any;
  };
  setModalState: (state: { open: boolean; data?: any }) => void;
  tableRef: any;
}

const CaseForm = ({ tableRef, modalState, setModalState }: CaseFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!modalState.data;

  const handleClose = () => {
    setModalState({ open: false });
    reset(); // Reset form when closing
  };

  const methods = useForm({
    resolver: yupResolver(CaseDTO),
    defaultValues: {
      id: null,
      name: "",
    },
  });

  const {
    reset,
    formState: { isDirty, errors },
  } = methods;
  console.log(errors);

  useEffect(() => {
    if (modalState.data) {
      reset({
        id: modalState.data.id,
        name: modalState.data.name || "",
      });
    } else {
      reset({
        id: null,
        name: "",
      });
    }
  }, [modalState.data, reset]);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);

    try {
      let response;

      if (isEditMode) {
        return;
      } else {
        const { id, ...caseData } = values;
        response = await axios.post(Routes.case, caseData);
      }

      handleClose();
      tableRef.current?.refetch();

      console.log(
        `Case ${isEditMode ? "updated" : "created"} successfully:`,
        response.data
      );
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400) {
        console.error("Validation error:", error.response.data);
      } else {
        console.error(`Error ${isEditMode ? "" : "creating"}:`, error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={modalState.open}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setModalState({ open, data: modalState.data });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? "Edit Case" : "Add New Case"}
                </DialogTitle>
                <DialogDescription>Casees</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <FormInput label="Name" name="name" disabled={isEditMode} />
              </div>

              <DialogFooter className="mt-5">
                <DialogClose asChild>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                {!isEditMode && (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? isEditMode
                        ? "Updating..."
                        : "Saving..."
                      : isEditMode
                      ? "Update"
                      : "Save"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaseForm;
