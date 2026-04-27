import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../../firebase';

function timeLabel(ts) {
  if (!ts?.seconds) return '';
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

export default function StudentUpdates() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const postsSnap = await getDocs(query(collection(db, 'teacherPosts'), orderBy('createdAt', 'desc')));
        setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Load student updates failed', e);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6">
        <h2 className="text-xl font-bold text-green-800 sm:text-2xl">{t('updates.newsTitle')}</h2>
        <div className="mt-4 space-y-3">
          {posts.length === 0 && <p className="text-sm text-gray-500">{t('updates.emptyNews')}</p>}
          {posts.map((post) => (
            <div key={post.id} className="rounded-lg border border-green-100 bg-green-50 p-3">
              <h3 className="font-semibold text-green-800">{post.title}</h3>
              <p className="mt-1 text-sm text-gray-700">{post.body}</p>
              <p className="mt-2 text-xs text-gray-500">{timeLabel(post.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
