export default function Head() {
  // Importante: alguns navegadores dão preferência ao "shortcut icon".
  // O querystring ajuda a furar cache quando você troca o arquivo.
  const v = '2';

  return (
    <>
      <link rel="icon" href={`/icon?v=${v}`} type="image/png" sizes="32x32" />
      <link rel="shortcut icon" href={`/icon?v=${v}`} type="image/png" sizes="32x32" />
      {/* Fallback SVG (alguns browsers usam, outros ignoram) */}
      <link rel="icon" href={`/favicon.svg?v=${v}`} type="image/svg+xml" />
    </>
  );
}

