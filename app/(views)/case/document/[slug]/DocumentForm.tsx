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
import { DocuemntDTO } from "@/Schemas/document/document.DTO";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import Routes from "@/Routes.json";
import axios from "axios";

interface DocumentFormProps {
  modalState: {
    open: boolean;
    data?: any;
  };
  setModalState: (state: { open: boolean; data?: any }) => void;
  refresh: any;
}

const DocumentForm = ({
  refresh,
  modalState,
  setModalState,
}: DocumentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!modalState?.data?.id;

  const handleClose = () => {
    setModalState({ open: false });
    reset(); // Reset form when closing
  };

  const methods = useForm({
    resolver: yupResolver(DocuemntDTO),
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
    values.caseId = +modalState.data.caseId;
    setIsSubmitting(true);

    try {
      let response;

      if (isEditMode) {
        return;
      } else {
        const { id, ...documentDate } = values;
        response = await axios.post(Routes.document, documentDate);
      }

      handleClose();
      refresh?.();

      console.log(
        `Document ${isEditMode ? "updated" : "created"} successfully:`,
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
                <DialogTitle>{"Add New Document"}</DialogTitle>
                <DialogDescription>Document</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <FormInput label="Name" name="name" />
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
                {
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? !isEditMode
                        ? "Updating..."
                        : "Saving..."
                      : isEditMode
                      ? "Update"
                      : "Save"}
                  </Button>
                }
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentForm;
