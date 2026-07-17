type Props = {
  className?: string;
};

/** Shown while waiting on free-tier Render wake-up / first DB request. */
export default function ColdStartWaitNote({ className = "" }: Props) {
  return (
    <p className={`text-sm leading-relaxed ${className}`} role="status">
      Please wait about 1 minute. The free-tier demo API sleeps after inactivity, so the first
      request must wake the server and reconnect to the database.
    </p>
  );
}
