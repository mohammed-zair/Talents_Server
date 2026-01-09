import React, { useEffect } from 'react';
import { AiOutlineMenu } from 'react-icons/ai';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { useStateContext } from '../contexts/ContextProvider';
import { useAuth } from '../contexts/AuthContext';

const NavButton = ({ title, customFunc, icon, color, dotColor }) => (
  <TooltipComponent content={title} position="BottomCenter">
    <button
      type="button"
      onClick={() => customFunc()}
      style={{ color }}
      className="relative text-xl rounded-full p-3 hover:bg-light-gray"
    >
      <span
        style={{ background: dotColor }}
        className="absolute inline-flex rounded-full h-2 w-2 right-2 top-2"
      />
      {icon}
    </button>
  </TooltipComponent>
);

const Navbar = () => {
  const { currentColor, activeMenu, setActiveMenu, setScreenSize, screenSize } = useStateContext();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);

    window.addEventListener('resize', handleResize);

    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (screenSize <= 900) {
      setActiveMenu(false);
    } else {
      setActiveMenu(true);
    }
  }, [screenSize]);

  const handleActiveMenu = () => setActiveMenu(!activeMenu);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border border-red-200';
      case 'agent': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'agent': return 'Agent';
      case 'user': return 'User';
      default: return role;
    }
  };

  return (
    <div className="flex justify-between p-2 md:ml-6 md:mr-6 relative">
      <div className="flex items-center">
        <NavButton
          title="Menu"
          customFunc={handleActiveMenu}
          color={currentColor}
          icon={<AiOutlineMenu />}
        />
        <div className="ml-4 hidden md:block">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Talents Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {user?.name || user?.email || 'Admin'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-4 mr-4">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
              {getRoleDisplayName(user?.role)}
            </span>
          </div>
        </div>

        <TooltipComponent content="Logout" position="BottomCenter">
          <button
            type="button"
            onClick={handleLogout}
            className="relative text-xl rounded-full p-3 hover:bg-light-gray text-red-500 hover:text-red-600 transition-colors"
            title="Logout"
          >
            <RiLogoutBoxRLine />
          </button>
        </TooltipComponent>

        <div className="flex items-center gap-2 cursor-default p-1 rounded-lg">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {getUserInitials(user?.name || user?.email)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-800 dark:text-white max-w-[120px] truncate">
              {user?.name || user?.email || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user?.role || 'admin'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
