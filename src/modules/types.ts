export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  adminOnly?: boolean;
}

export interface AppModule {
  id: string;
  name: string;
  description: string;
  version: string;
  navItems: NavItem[];
  sheetNames: string[];
  enabled: boolean;
}
