-- ============================================
-- Trigger pour créer automatiquement une entrée
-- dans public.users quand un utilisateur s'inscrit
-- ============================================

-- Fonction appelée par le trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'employe',  -- ✅ CORRIGÉ : 'employe' au lieu de 'secretaire'
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Ignorer si déjà existant
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Commentaire
COMMENT ON FUNCTION public.handle_new_user() IS 'Crée automatiquement une entrée dans public.users lors de l inscription';
