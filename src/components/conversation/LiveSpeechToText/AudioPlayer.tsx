export default function AudioPlayer({ src }: { src: string }) {
  return <audio src={src} controls />;
}
