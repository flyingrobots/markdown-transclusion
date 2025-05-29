### Características Principales

- **Transclusión Recursiva**: Los archivos incluidos pueden incluir otros archivos
- **Detección de Referencias Circulares**: Previene bucles infinitos automáticamente
- **Extracción de Encabezados**: Incluye solo secciones específicas usando `#encabezado`
- **Sustitución de Variables**: Nombres de archivo dinámicos con sintaxis `{{variable}}`
- **Procesamiento por Stream**: Manejo eficiente de documentos grandes
- **Recuperación de Errores**: Manejo elegante de archivos faltantes

### Características Avanzadas

- Control de profundidad máxima para prevenir recursión profunda
- Soporte para extensiones de archivo personalizadas
- Modo de validación para pipelines CI/CD
- Informes de errores completos
- Protección contra path traversal para seguridad