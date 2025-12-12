import { notFound } from 'next/navigation'
import { databases, DATABASE_ID, USERS_COLLECTION_ID, LINKS_COLLECTION_ID, Query } from '@/lib/appwrite'
import ProfileView from './ProfileView'

interface Props {
  params: { username: string }
}

async function getProfileData(username: string) {
  try {
    // Find user by username
    const users = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('username', username)]
    )
    
    if (users.total === 0) return null
    
    const user = users.documents[0]

    // Get user's links
    const linksResult = await databases.listDocuments(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.orderAsc('order')
      ]
    )
    
    return {
      user: {
        name: user.name,
        username: user.username,
        bio: user.bio || '',
        avatar: user.avatar || '',
      },
      links: linksResult.documents.map((link: any) => ({
        _id: link.$id,
        title: link.title,
        url: link.url,
        icon: link.icon,
      }))
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

export async function generateMetadata({ params }: Props) {
  const data = await getProfileData(params.username)
  
  if (!data) {
    return { title: 'User Not Found | DevLinks' }
  }
  
  return {
    title: `${data.user.name} | DevLinks`,
    description: data.user.bio || `Check out ${data.user.name}'s links`,
  }
}

export default async function ProfilePage({ params }: Props) {
  const data = await getProfileData(params.username)
  
  if (!data) {
    notFound()
  }

  return <ProfileView user={data.user} links={data.links} />
}
