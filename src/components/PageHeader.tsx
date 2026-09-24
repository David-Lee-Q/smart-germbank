import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface Props {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2.5, gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h5" sx={{ fontSize: 22 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  )
}
