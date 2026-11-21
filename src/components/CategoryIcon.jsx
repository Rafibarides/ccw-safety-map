import {
  Beer,
  Wine,
  GraduationCap,
  School,
  Baby,
  Trees,
  Landmark,
  Scale,
  Mail,
  Hospital,
  Church,
  TrainFront,
  Plane,
  Vote,
  Map,
  Library,
  MapPin,
} from 'lucide-react';

const ICON_MAP = {
  Beer,
  Wine,
  GraduationCap,
  School,
  Baby,
  Trees,
  Landmark,
  Scale,
  Mail,
  Hospital,
  Church,
  TrainFront,
  Plane,
  Vote,
  Map,
  Library,
};

export default function CategoryIcon({ name, size = 16, color, strokeWidth = 2, ...rest }) {
  const Icon = ICON_MAP[name] || MapPin;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} {...rest} />;
}
