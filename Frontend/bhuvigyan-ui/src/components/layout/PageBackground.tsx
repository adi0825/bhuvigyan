export default function PageBackground() {
  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      <div style={{position:'fixed',inset:0,zIndex:0,
        background:'rgba(255,255,255,0.87)'}} />
    </>
  );
}
