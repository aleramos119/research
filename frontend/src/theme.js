import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#3b82f6' },
    secondary: { main: '#7c3aed', dark: '#6d28d9' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e2e8f0',
    error: { main: '#ef4444' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    info: { main: '#06b6d4' },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
    '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.03)',
    '0 20px 25px -5px rgba(0,0,0,0.07), 0 10px 10px -5px rgba(0,0,0,0.02)',
    ...Array(20).fill('none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { background-color: #f8fafc; }
        a { color: inherit; }
      `,
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          color: '#0f172a',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, textTransform: 'none' },
        contained: { boxShadow: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
});

export default theme;
