/**
 * Numia v1.0 - Category Icon Component
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface CategoryIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}

// Map of icon names to Font Awesome icon definitions
const iconMap: Record<string, IconDefinition> = {
  // Gastos
  'utensils': Icons.faUtensils,
  'laptop': Icons.faLaptop,
  'house': Icons.faHouse,
  'car': Icons.faCar,
  'film': Icons.faFilm,
  'heart-pulse': Icons.faHeartPulse,
  'shirt': Icons.faShirt,
  'wine-bottle': Icons.faWineBottle,

  // Ingresos
  'wallet': Icons.faWallet,
  'briefcase': Icons.faBriefcase,
  'chart-line': Icons.faChartLine,
  'gift': Icons.faGift,

  // Otros comunes
  'circle': Icons.faCircle,
  'star': Icons.faStar,
  'check': Icons.faCheck,
  'times': Icons.faTimes,
  'plus': Icons.faPlus,
  'minus': Icons.faMinus,
  'dollar-sign': Icons.faDollarSign,
  'euro-sign': Icons.faEuroSign,
  'pound-sign': Icons.faPoundSign,
  'yen-sign': Icons.faYenSign,
};

export function CategoryIcon({ icon, className, style }: CategoryIconProps) {
  // Si es un emoji (no está en el mapa), renderizarlo como texto
  if (!iconMap[icon]) {
    return <span className={className} style={style}>{icon}</span>;
  }

  // Renderizar icono de Font Awesome
  return (
    <FontAwesomeIcon
      icon={iconMap[icon]}
      className={className}
      style={style as any}
    />
  );
}
