-- AlterEnum: Aggiungi PENDING_EQUIPMENT allo status Onboarding
ALTER TYPE "OnboardingStatus" ADD VALUE 'PENDING_EQUIPMENT';

-- Aggiorna default per nuovi onboarding (solo per riferimento schema, i nuovi useranno PENDING_EQUIPMENT)
-- Gli onboarding esistenti mantengono il loro status attuale
