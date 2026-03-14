export const validateApplyStep = (currentStep, formData, locationStatus) => {
    let tempErrors = {};
    let isValid = true;

    if (currentStep === 1) {
        if (!formData.name.trim()) tempErrors.name = "Name is required";
        if (!formData.mobile || !/^\d{10}$/.test(formData.mobile))
            tempErrors.mobile = "Valid 10-digit mobile number required";
        if (!formData.dndConsent)
            tempErrors.dndConsent = "Please provide consent to proceed.";
    }

    if (currentStep === 2) {
        if (!formData.pincode || !/^\d{6}$/.test(formData.pincode))
            tempErrors.pincode = "Valid 6-digit Pincode required";
        if (!formData.city)
            tempErrors.city = "City could not be detected";
        if (!formData.locality && !locationStatus.isManual)
            tempErrors.locality = "Locality / Area is required";
    }

    if (currentStep === 3) {
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
            tempErrors.email = "Valid Email is required";
        if (!formData.education)
            tempErrors.education = "Education level is required";
        if (!formData.occupation)
            tempErrors.occupation = "Current status is required";
    }

    if (Object.keys(tempErrors).length > 0) {
        isValid = false;
    }

    return { isValid, tempErrors };
};
