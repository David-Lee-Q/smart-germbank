import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1b7a43' },
    secondary: { main: '#3f6ad8' },
    success: { main: '#2e9e5b' },
    warning: { main: '#d99114' },
    error: { main: '#c0392b' },
    background: { default: '#f4f7f5', paper: '#ffffff' },
    text: { primary: '#1f2d27', secondary: '#5b6b63' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width:600px)': { margin: 12, width: 'calc(100% - 24px)' },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { '@media (max-width:600px)': { padding: 16 } },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: { flexWrap: 'wrap', rowGap: 4 },
        selectLabel: { '@media (max-width:600px)': { display: 'none' } },
        input: { '@media (max-width:600px)': { display: 'none' } },
        displayedRows: { '@media (max-width:600px)': { marginLeft: 'auto', whiteSpace: 'nowrap' } },
        actions: { '@media (max-width:600px)': { marginLeft: 0 } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #e4ece7', boxShadow: '0 1px 3px rgba(16,40,28,0.04)' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: '#f2f7f3' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: '#3c4a43' },
      },
    },
  },
})

export default theme
