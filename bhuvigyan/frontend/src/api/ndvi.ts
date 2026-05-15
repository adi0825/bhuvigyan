import { apiClient } from './client'

export async function computeNDVI(
  geojson_geometry: any,
  survey_number: string,
  months_back: number = 1
) {
  const { data } = await apiClient.post('/ndvi/compute', {
    geojson_geometry,
    survey_number,
    months_back
  })
  return data
}

export async function computeNDVITimeseries(
  geojson_geometry: any,
  survey_number: string,
  months: number = 12
) {
  const { data } = await apiClient.post('/ndvi/timeseries', {
    geojson_geometry,
    survey_number,
    months
  })
  return data
}
