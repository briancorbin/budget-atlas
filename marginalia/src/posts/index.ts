import type { Post } from '../types';
import { post0 } from './post-0';
import { post1 } from './post-1';

/** Newest first. Whatever order this list is in is the order on the index. */
export const posts: Post[] = [post1, post0];

export function findPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
