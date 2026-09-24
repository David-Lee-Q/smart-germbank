import type { ReactNode } from 'react'
import { Card, CardContent, Box, Stack, Typography } from '@mui/material'

interface Props {
  title: string
  value: string | number
  caption?: string
  icon: ReactNode
  color?: string
}

export default function StatCard({ title, value, caption, icon, color = '#1b7a43' }: Props) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color }}>
              {value}
            </Typography>
            {caption && (
              <Typography variant="caption" color="text.secondary">
                {caption}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color,
              bgcolor: `${color}18`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
