{{/*
Expand the name of the chart.
*/}}
{{- define "${{ values.component_id }}.name" -}}
{{ .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "${{ values.component_id }}.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${{ values.component_id }}.labels" -}}
helm.sh/chart: {{ include "${{ values.component_id }}.chart" . }}
{{ include "${{ values.component_id }}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
See https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
*/}}
{{- define "${{ values.component_id }}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${{ values.component_id }}.name" . }}
app.kubernetes.io/env: {{ .Values.opa.environmentName }}
{{- end }}
