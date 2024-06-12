import styles from './memory.module.scss';
import { type Memory } from '@/tooFake';
import Image from 'next/image';

interface Props {
  memory: Memory;
}
const Memory = ({ memory }: Props) => {
  // Config
  // TODO: Move this to a centralized place
  const dateFormatOptions: any = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  // Component
  // TODO: Add a Button to allow downloading
  return (
    <label
      className={styles.container}
      key={memory.id}
      htmlFor={`switchPrimary_${memory.id}`}
    >
      <input
        type="checkbox"
        name={`switchPrimary_${memory.id}`}
        id={`switchPrimary_${memory.id}`}
      ></input>
      <div>
        <div className={styles.primary}>
          <Image
            src={memory.primary.url}
            alt="Primary Image"
            unoptimized
            fill
          ></Image>
        </div>
        <div className={styles.secondary}>
          <Image
            src={memory.secondary.url}
            alt="Secondary Image"
            unoptimized
            fill
          ></Image>
        </div>
      </div>
      <div className={styles.info}>
        <span>
          Taken {memory.isLate ? 'late' : 'on time'},{' '}
          {new Date(memory.memoryDay).toLocaleDateString(
            undefined,
            dateFormatOptions
          )}
        </span>
      </div>
    </label>
  );
};

export default Memory;
