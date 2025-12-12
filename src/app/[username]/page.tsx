import { notFound } from 'next/navigation'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Link from '@/models/Link'
import ProfileView from './ProfileView'

interface Props {
  params: { username: string }
}

async function getProfileData(username: string) {
  await dbConnect()
  
  const user = await User.findOne({ username }).select('-password')
  if (!user) return null

  const links = await Link.find({ userId: user._id }).sort({ order: 1 })
  
  return {
    user: {
      name: user.name,
      username: user.username,
      bio: user.bio || '',
      avatar: user.avatar || '',
    },
    links: links.map(link => ({
      _id: link._id.toString(),
      title: link.title,
      url: link.url,
      icon: link.icon,
    }))
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
