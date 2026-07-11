# Deployment

This repository does not yet define a single deployment pipeline inside the docs tree, so use this page to capture the real release process as it is standardized.

## Things to document here

- Required environment variables for Supabase and Next.js
- Where the app is hosted
- How migrations are applied
- How background or edge functions are deployed
- Which branches or tags trigger releases

## Current assumptions

- The project relies on Supabase for auth and data services
- The Next.js app expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the environment
- Protected routes should be validated after deployment because middleware handles part of the access control flow
