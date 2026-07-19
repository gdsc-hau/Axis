'use server';

/**
 * Public self-registration is disabled.
 * Members are onboarded via an admin-sent invitation email.
 * This stub prevents any direct calls to signup from working.
 */
export async function signup(_formData: FormData) {
  return {
    error:
      'Public registration is not available. Access to GDG HAU Axis is by invitation only. Please contact an administrator.',
  };
}
