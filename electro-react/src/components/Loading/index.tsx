import styles from "./Loading.module.css";

const Loading = () => {
  return (
    <div className={styles.loading}>
      <div className={styles.loader} />
    </div>
  );
};

export default Loading;
