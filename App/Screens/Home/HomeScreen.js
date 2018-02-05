// @flow
import * as React from 'react'
import { View, ScrollView, Alert } from 'react-native'
import Firebase from 'react-native-firebase'
import { firebaseConnect, populate } from 'react-redux-firebase'
import { connect } from 'react-redux'
import Mailer from 'react-native-mail'
import { DateTime } from 'luxon'

import { firebaseProfilePopulates } from '../../Config/FirebaseConfig'
import type { Teacher, Request } from '../../Types/DatabaseTypes'
import CurrentSeminarCard from './Components/CurrentSeminarCard'

import Styles from './Styles/HomeScreenStyles'

type Props = {
  profile: {
    defaultSeminar: string,
    name: string,
    lastRequest: string
  },
  populatedProfile: {
    defaultSeminar: ?Teacher,
    name: string,
    schoolID: string,
    lastRequest: Request
  },
  firebase: any
}

type State = {
  seminarTeacher: ?Teacher
}

@firebaseConnect()
@connect(({ firebase }) => ({
  profile: firebase.profile,
  populatedProfile: populate(firebase, 'profile', firebaseProfilePopulates)
}))
export default class HomeScreen extends React.Component<Props, State> {
  state = {
    seminarTeachers: [ null, null ]
  }

  componentWillReceiveProps (nextProps: Props) {
    let nextSeminarTuesday = DateTime.local().set({ weekday: 2, hour: 12, minute: 30 }) // day(7 + 2).hour(12).minute(30)
    let nextSeminarWednesday = DateTime.local().set({ weekday: 3, hour: 12, minute: 30 })

    let nextSeminar = (nextSeminarTuesday < nextSeminarWednesday)
      ? nextSeminarTuesday
      : nextSeminarWednesday

      // TODO: Attach a requsted timestamp onto every reqest
    if (nextProps.populatedProfile.lastRequest &&
      nextProps.populatedProfile.lastRequest.accepted &&
      nextProps.populatedProfile.lastRequest.teacher &&
      DateTime.fromISO(nextProps.populatedProfile.lastRequest.requestedTime) > nextSeminar) {
      Firebase.database().ref('teachers/' + nextProps.populatedProfile.lastRequest.teacher).once('value', function (teacherSnapshot) {
        this.setState({
          seminarTeacher: [teacherSnapshot.val(), null]
        })
      }.bind(this))
    } else {
      this.setState({
        seminarTeachers: [nextProps.populatedProfile.seminars.a, nextProps.populatedProfile.seminars.b]
      })
    }
  }

  handleEmail = (email: string) => {
    Mailer.mail({
      subject: 'Support Seminar Help',
      recipients: [email]
    }, (error, event) => {
      if (!__DEV__) {
        Firebase.fabric.crashlytics().log('Mailer Error on HomeScreen')
        Firebase.fabric.crashlytics().recordError(100, error)
      }

      Alert.alert(
        'Error',
        'An error occured when trying to launch the email app.',
        [
          { text: 'OK' }
        ],
        { cancelable: true }
      )
    })
  }

  render () {
    return (
      <ScrollView style={Styles.mainContainer}>
        <View style={Styles.container}>
          <CurrentSeminarCard day='A' seminarTeacher={this.state.seminarTeachers[0]} onClick={this.handleEmail} />
          <CurrentSeminarCard day='B' seminarTeacher={this.state.seminarTeachers[1]} onClick={this.handleEmail} />
        </View>
      </ScrollView>
    )
  }
}
