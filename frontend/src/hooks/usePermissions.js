// src/hooks/usePermissions.js
import { useUser } from '../context/UserContext';

export function usePermissions() {
  const { user } = useUser();

  const getAccessLevel = () => {
    if (!user) return null;
    const fonction = user.fonction;
    if (fonction === 'Admin') return 'admin';
    if (fonction === 'Vérificateur') return 'federation';
    if (fonction === 'Pasteur') return 'district';
    if (fonction === 'Ancien' || fonction === 'Trésorier') return 'eglise';
    return null;
  };

  const canViewEglise = (eglise, district, federation) => {
    const level = getAccessLevel();
    if (!level) return false;
    switch (level) {
      case 'admin': return true;
      case 'federation':
        return user.federation === federation;
      case 'district':
        return user.district === district;
      case 'eglise':
        return user.eglise === eglise;
      default: return false;
    }
  };

  const canEditEglise = (eglise, district, federation) => {
    const level = getAccessLevel();
    if (!level) return false;
    switch (level) {
      case 'admin': return true;
      case 'federation': return false;
      case 'district':
        return user.district === district;
      case 'eglise':
        return user.eglise === eglise;
      default: return false;
    }
  };

  const isReadOnly = (eglise, district, federation, hasData) => {
    const level = getAccessLevel();
    if (level === 'federation') return true;
    if (level === 'district') {
      return hasData === true;
    }
    return false;
  };

  const filterEglises = (eglises) => {
    const level = getAccessLevel();
    if (!level) return [];
    if (level === 'admin') return eglises;
    if (level === 'federation') {
      return eglises.filter(eg => eg.federation === user.federation);
    }
    if (level === 'district') {
      return eglises.filter(eg => eg.district === user.district);
    }
    if (level === 'eglise') {
      return eglises.filter(eg => eg.nom === user.eglise);
    }
    return [];
  };

  const getVisibleDistricts = (districts) => {
    const level = getAccessLevel();
    if (!level) return [];
    if (level === 'admin') return districts;
    if (level === 'federation') {
      return districts.filter(d => d.federation === user.federation);
    }
    if (level === 'district') {
      return districts.filter(d => d.nom === user.district);
    }
    if (level === 'eglise') {
      return districts.filter(d => d.nom === user.district);
    }
    return [];
  };

  const getAccessLevelLabel = () => {
    const level = getAccessLevel();
    const labels = { admin: 'Administration', federation: 'Fédération', district: 'District', eglise: 'Église' };
    return labels[level] || 'Utilisateur';
  };

  const getAccessLevelIcon = () => {
    const level = getAccessLevel();
    const icons = { admin: 'fas fa-crown', federation: 'fas fa-globe', district: 'fas fa-church', eglise: 'fas fa-building' };
    return icons[level] || 'fas fa-user';
  };

  return {
    user,
    getAccessLevel,
    getAccessLevelLabel,
    getAccessLevelIcon,
    canViewEglise,
    canEditEglise,
    isReadOnly,
    filterEglises,
    getVisibleDistricts
  };
}